import React from 'react'
import DocumentTitle from 'react-document-title'

export default function About() {
  return <div>
    <DocumentTitle title='关于 - 觅马出行工单' />
    <h1 className='font-logo'>觅马出行工单系统</h1>
    <hr />
    <p>该应用是 <a href='http://www.mimadd.com/index.action'>觅马出行</a> 的工单系统。为了更有效的追踪问题而创建。</p>
    <p>1）车辆日常运维：电池更换</p>
      <p>2）车辆日常运维：问题车辆下线处理</p>
      <p>3）车辆日常运维：车辆调度</p>
      <p>4）车辆日常运维：车辆维修配件申请</p>
      <p>5）觅马系统的使用</p>
      <p>6）其他问题</p>

  </div>
}

About.displayName = 'About'
